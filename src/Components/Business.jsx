import React, { useEffect, useState } from "react";
import { getDatabase } from "../DB/initDatabase";
import { v4 as uuidv4 } from "uuid";

const Business = () => {
    const [name, setName] = useState("");
    const [businesses, setBusinesses] = useState([]);

    const [articleName, setArticleName] = useState("");
    const [qty, setQty] = useState("");
    const [price, setPrice] = useState("");
    const [selectedBusinessId, setSelectedBusinessId] = useState("");
    const [articles, setArticles] = useState([]);

    const fetchBusinesses = async () => {
        const db = await getDatabase();
        const collection = db.businesses;
        const allDocs = await collection.find().exec();
        const businessList = allDocs.map((doc) => doc.toJSON());
        setBusinesses(businessList);
        if (businessList.length > 0) {
            setSelectedBusinessId(businessList[0].id);
        }
    };

    const fetchArticles = async () => {
        const db = await getDatabase();
        const collection = db.articles;
        const allDocs = await collection.find().exec();
        setArticles(allDocs.map((doc) => doc.toJSON()));
    };

    const handleAddBusiness = async () => {
        if (!name.trim()) {
            alert("Enter Business Name");
            return;
        }
        const db = await getDatabase();
        const collection = db.businesses;

        const newBusiness = {
            id: uuidv4(),
            name: name.trim(),
        };

        await collection.insert(newBusiness);
        setName("");
        fetchBusinesses();
    };

    const handleAddArticle = async () => {
        if (!articleName || !qty || !price || !selectedBusinessId) {
            alert("Fill all article fields");
            return;
        }
        const db = await getDatabase();
        const collection = db.articles;

        const newArticle = {
            id: uuidv4(),
            name: articleName.trim(),
            qty: parseInt(qty),
            selling_price: parseFloat(price),
            business_id: selectedBusinessId,
        };

        await collection.insert(newArticle);
        setArticleName("");
        setQty("");
        setPrice("");
        fetchArticles();
    };

    useEffect(() => {
        fetchBusinesses();
        fetchArticles();
    }, []);

    return (
        <div>
            <h3>Create Business</h3>
            <div>
                <input
                    type="text"
                    placeholder="Business Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <button
                    onClick={handleAddBusiness}
                    style={{ marginLeft: "10px" }}
                >
                    Add Business
                </button>
            </div>

            <br />

            <h3>Create Article</h3>
            <div>
                <select
                    value={selectedBusinessId}
                    onChange={(e) => setSelectedBusinessId(e.target.value)}
                >
                    {businesses.map((b) => (
                        <option key={b.id} value={b.id}>
                            {b.name}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    placeholder="Article Name"
                    value={articleName}
                    onChange={(e) => setArticleName(e.target.value)}
                />
                <input
                    type="number"
                    placeholder="Quantity"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                />
                <input
                    type="number"
                    placeholder="Selling Price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                />
                <button
                    onClick={handleAddArticle}
                    style={{ marginLeft: "10px" }}
                >
                    Add Article
                </button>
            </div>

            <br />

            <h3>Businesses & Their Articles</h3>
            {businesses.map((b) => (
                <div key={b.id}>
                    <h4>{b.name}</h4>
                    <ul>
                        {articles
                            .filter((a) => a.business_id === b.id)
                            .map((a) => (
                                <li key={a.id}>
                                    {a.name} - Qty: {a.qty} - Price: ₹
                                    {a.selling_price}
                                </li>
                            ))}
                    </ul>
                </div>
            ))}
        </div>
    );
};

export default Business;
